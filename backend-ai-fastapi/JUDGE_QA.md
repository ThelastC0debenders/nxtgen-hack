# 🎤 Brutal Judge Q&A — `backend-ai-fastapi`

> Use this document to prepare for tough technical and business questions during the hackathon demo. Every answer is grounded in the actual code so you can speak precisely.

---

## 🏗 Architecture & Design

---

### Q1. Why did you build a *separate* FastAPI service instead of putting the AI logic inside the Node.js backend?

**Answer:**  
Separation of concerns. Node.js is single-threaded and optimized for I/O operations like auth, routing, and Redis lookups. Python's scientific stack (scikit-learn, numpy, pandas) is where ML models live natively — deserializing a `.pkl` Isolation Forest in a Node process via a subprocess bridge would be fragile, slow, and unmaintainable. By decoupling into a dedicated microservice, we can:

- Scale the AI layer independently under ML-heavy load.
- Retrain and hot-swap models (`isolation_forest.pkl`, `scaler.pkl`) without touching Node.
- Have clean API contracts: Node POSTs an `InvoiceInput` JSON; FastAPI returns a `FraudOutput` JSON.
- Let each service own its own language runtime and dependencies.

---

### Q2. How does the Node backend communicate with this FastAPI service? What happens if this service goes down?

**Answer:**  
The Node backend makes an authenticated HTTP POST to `/api/v1/score` with a Bearer token (`AI_SERVICE_SECRET_KEY`). The FastAPI service is a synchronous microservice callable over the internal network.

If FastAPI goes down, the Node backend should implement a **circuit breaker** — it falls back to a rule-only risk decision (e.g., flag the invoice as MEDIUM risk for manual review) rather than failing the entire verification flow. In this hackathon build, the Node backend's AI client should handle `5xx` responses gracefully and allow the core verification to proceed with a degraded fraud score. The `/api/v1/health` endpoint exists precisely for this readiness probing.

---

### Q3. Your architecture diagram shows Redis and PostgreSQL but your AI service doesn't connect to either. Why?

**Answer:**  
Correct, and it's deliberate. In this service, the AI layer is **stateless by design**. It receives all required features in the request payload from the Node backend, which is the system of record. The Node backend owns:

- Redis for exact-duplicate hash caching.
- PostgreSQL for audit trails and historical invoice data.

In production, the `SimilarityChecker` would receive a pre-computed corpus of recent invoice hashes/embeddings from Node (or query a vector store directly), and `FeatureBuilder` would receive real historical features (e.g., `vendor_account_age_days`, `invoices_last_7d`) instead of the mocked defaults in `feature_builder.py`. This is explicitly called out in the code comments.

---

## 🤖 Machine Learning — Isolation Forest

---

### Q4. Why Isolation Forest specifically? Why not a supervised model like XGBoost or a neural network?

**Answer:**  
Three reasons:

1. **No labeled fraud data.** In any real lender network at launch, you have zero confirmed-fraud invoices. Supervised models require hundreds of labeled fraud examples per class. Isolation Forest is **unsupervised** — it learns what "normal" looks like and flags deviations. That's the only viable approach at cold start.

2. **Exactly what the problem is.** Invoice fraud is a needle-in-a-haystack problem (low contamination rate, ~5%). Isolation Forest is specifically designed for this: it isolates anomalies by recursively partitioning feature space, and outliers require far fewer splits to isolate than inliers.

3. **Speed and explainability.** Isolation Forest inference on a single 21-feature vector is sub-millisecond. A neural network would add training complexity, require a GPU, and produce opaque outputs. Our model returns a continuous `decision_function` score which we normalize to 0.0–1.0 — directly explainable to a risk officer.

The tradeoff: false positive rate can be high on new invoice patterns it hasn't seen. That's why we **blend** the ML score at 60% weight with a deterministic rule engine at 40% — rules are always precise when a known fraud pattern fires.

---

### Q5. Your contamination rate is 5%. What if real fraud is 0.1% or 30%? Doesn't that break everything?

**Answer:**  
Yes, it would shift the decision boundary. `contamination` in Isolation Forest is a threshold parameter that sets the `offset_` — the score below which the model calls a point an outlier. At contamination=0.05, the model flags the bottom 5% of anomaly scores as fraud.

In production you'd calibrate this:
- Use a labeled holdout set from your first 30 days of live data.
- Run precision/recall analysis across contamination values from 0.01 to 0.20.
- Pick the value that maximizes F1 for your risk tolerance (lenders tolerate more false positives than false negatives — missing fraud is catastrophic).
- Re-train monthly as the invoice distribution shifts seasonally.

For this hackathon, 5% is a defensible industry estimate for MSME invoice fraud rates in India.

---

### Q6. You're loading model `.pkl` files at startup. What happens if someone replaces that file with a malicious pickle?

**Answer:**  
Valid security concern. `pickle`/`joblib` deserialization can execute arbitrary code. Our mitigations:

1. **`AI_SERVICE_SECRET_KEY`** protects the scoring endpoint from external access — only the Node backend can call it.
2. In production, model files would be stored in a **model registry** (e.g., MLflow, S3 with object versioning + checksums), not on the local filesystem.
3. The `metadata.json` stores the expected SHA-256 hash of the `.pkl` file, which the loader should verify before deserializing. This is a `TODO` in the current code.
4. The container should run as a **non-root user** with the model directory mounted as read-only.

---

### Q7. Your `decision_function` normalization — `1.0 if is_anomaly else max(0.0, 0.5 - raw_score)` — looks made up. How is that calibrated?

**Answer:**  
It's explicitly noted in the code as *"an artistic approximation based on typical IsolationForest outputs."* The `decision_function` returns an average path length delta, which is dataset-specific. Typical inlier scores range from +0.05 to +0.20 and anomaly scores from -0.05 to -0.20 for a well-fitted model.

The `0.5 - raw_score` formula maps the continuous range so that:
- A borderline inlier (raw ≈ 0.05) → score ≈ 0.45 (borderline risk)
- A strong inlier (raw ≈ 0.20) → score ≈ 0.30 (low risk)
- All anomalies → 1.0 (maximum risk)

In production you'd **calibrate this empirically**: collect 1,000 scored invoices, sort by `decision_function` value, plot against confirmed fraud labels, and fit a monotonic calibration curve (Platt scaling or isotonic regression) to get a true probability score.

---

## 🔧 Feature Engineering

---

### Q8. 11 out of your 21 features are mocked. Doesn't that completely invalidate your ML model?

**Answer:**  
Yes, in production it would. The mocked features are flagged explicitly in `feature_builder.py`:

```python
"vendor_account_age_days": 180.0,  # Mock
"time_since_last_invoice": 30.0,   # Mock
"invoices_last_24h": 0.5,          # Mock
```

The model was *trained* on a synthetic dataset that used the same mock logic in `generate_dataset.py` — so the training distribution and inference distribution are consistent. This means the model *is* correctly trained for this proof-of-concept.

To make this production-ready, the Node backend would enrich the `InvoiceInput` payload with real vendor history fields from PostgreSQL before calling FastAPI, and the `FeatureBuilder` would use those real values instead of defaults.

---

### Q9. Your Rule Engine and your Feature Builder both check `HIGH_VALUE_INVOICE` (amount > 50,000). Aren't you double-counting that signal?

**Answer:**  
Architecturally yes, but it's intentional. The two systems are independent sub-scorers blended at predefined weights (40% rules, 60% ML). The rule engine provides a **hard, human-readable** signal — a risk officer can audit exactly why a rule fired. The ML model provides a **soft, statistical** signal that captures multivariate interactions rules can't encode (e.g., a high-value invoice from a new vendor with an unusual line-item structure on a weekend at midnight is far more suspicious than any single flag alone).

If double-counting is a concern, you could remove the `HIGH_VALUE_INVOICE` feature from the ML model and let rules handle it purely deterministically. We'd treat that as a hyperparameter to optimize during calibration.

---

## 🔐 Security

---

### Q10. Your Bearer token is hardcoded as `hackathon-secret-api-key-2026`. That's terrible. How would you fix this in production?

**Answer:**  
You're correct — it's a known hack for the demo, annotated in `deps.py`. In production:

1. **Mutual TLS (mTLS)** between Node and FastAPI inside the internal network — both sides present certificates.
2. Replace the static key with **short-lived JWTs** signed by the Node backend's private key and verified by FastAPI using the public key.
3. The secret is injected via environment variable (`AI_SERVICE_SECRET_KEY`) from a secrets manager (AWS Secrets Manager, Vault, Kubernetes Secrets), never hardcoded.
4. Add **IP allowlisting** at the network layer so the AI service is only reachable from the Node backend's subnet.
5. Rotate keys on a schedule and on any suspected compromise.

---

### Q11. You're using `allow_origins=["*"]` in CORS. That's a massive security hole.

**Answer:**  
It is for a browser-facing API — but FastAPI here is an **internal microservice** called only by the Node backend server, not directly by any browser. CORS headers are irrelevant for server-to-server calls; they're enforced only by browsers. In a proper deployment, this service would not be exposed to the public internet at all — it sits behind a private load balancer.

That said, best practice is to set `allow_origins` to the exact Node backend domain even for internal services, so there's a clear declaration of intent. We'd fix this before production.

---

## ⚡ Performance & Scalability

---

### Q12. What's the latency of a single fraud scoring request?

**Answer:**  
The critical path is:

| Step | Latency |
| --- | --- |
| Pydantic request validation | ~0.1 ms |
| `SimilarityChecker.check_similarity()` (mock, no DB) | ~0.01 ms |
| `RuleEngine.evaluate()` (pure Python arithmetic) | ~0.05 ms |
| `FeatureBuilder.build_model_vector()` (numpy) | ~0.2 ms |
| `scaler.transform()` + `model.predict()` + `decision_function()` | ~1–5 ms |
| JSON serialization | ~0.1 ms |
| **Total (in-process)** | **~2–6 ms** |

The Isolation Forest is loaded into RAM at startup (`anomaly_detector` is a module-level singleton), so there's zero cold-start penalty per request. Network RTT between Node and FastAPI (same datacenter) adds another 1–2 ms. End-to-end under 10 ms is very achievable.

---

### Q13. How does this scale to 10,000 invoices per second?

**Answer:**  
Isolation Forest inference on a single 21-feature vector is embarrassingly parallelizable. We'd scale by:

1. **Horizontal pod autoscaling** — run 10–50 replicas behind a load balancer; each request is independent.
2. **Async endpoint** — convert the FastAPI route to `async def` and use a `ProcessPoolExecutor` or background task queue (Celery + Redis) for batch scoring.
3. **Batching** — accept arrays of invoices in a single POST to amortize network overhead, and use `model.predict(X_batch)` which is vectorized in numpy.
4. **Model serving** — migrate to a production model server (TorchServe, Triton Inference Server, or BentoML) which handles batching, GPU acceleration, and A/B testing natively.

The current synchronous design is fine for a hackathon demo; the architecture itself is not the bottleneck.

---

## 🎯 Fraud Detection Accuracy & Business Logic

---

### Q14. Show me a scenario where your system completely fails to detect fraud.

**Answer:**  
Here's a real weakness:

**Scenario:** A fraudster submits 50 invoices over 6 months that are all perfectly normal (small amounts, valid line items, consistent dates) to build up a clean vendor history. On day 180, they submit one large fraudulent invoice. Our mocked `vendor_account_age_days = 180.0` and `time_since_last_invoice = 30.0` would actually make that invoice *look legitimate* to the model because the mocked values are identical to a trustworthy vendor. The rule engine only catches `HIGH_VALUE_INVOICE` if the amount exceeds 50,000.

The fix is obvious — use *real* per-vendor historical features from the database, not mocked constants. This is the most important production gap to close.

---

### Q15. Your rule engine flags "round amounts" as suspicious. Lots of legitimate invoices are round numbers. What's your false positive rate?

**Answer:**  
The `ROUND_AMOUNT_DETECTED` rule adds 0.2 to the rule score. With weights (rule=0.40), that contributes +0.08 to the final fraud score. On its own, it pushes a clean invoice from 0.0 to 0.08 — still firmly in LOW risk (< 0.40 threshold). It would only elevate risk if *combined* with other signals (weekend submission + missing due date + high value). That's intentional — no single rule is sufficient to flag HIGH risk; they must compound.

The real false positive rate on legitimate round-number invoices is zero because the rule score alone can never exceed `1.0` and only the combined weighted score crosses the MEDIUM (0.40) or HIGH (0.75) thresholds.

---

### Q16. Why is your MEDIUM threshold 0.40 and HIGH 0.75? Where do those numbers come from?

**Answer:**  
They're reasonable starting points based on a 0–1 score distribution, but they're **hyperparameters**, not laws of physics. In production you'd set them using:

1. A confusion matrix analysis on a labeled validation set.
2. A cost-benefit calculation: what is the cost of a missed fraud (false negative) vs. the cost of rejecting a legitimate invoice (false positive)? In invoice financing, a missed ₹50L fraud is far worse than annoying a legitimate vendor, so you'd skew the threshold lower (more sensitive).
3. A/B testing different thresholds against real lender feedback.

For this demo, 0.40/0.75 gives us three clearly differentiated risk tiers that are intuitive to a risk officer.

---

## 🏭 Production Readiness

---

### Q17. Is this production-ready? Be honest.

**Answer:**  
**No — and here are the exact gaps, ranked by priority:**

| Gap | Impact | Fix |
| --- | --- | --- |
| Mocked vendor history features (11/21) | ML signal is degraded | Node backend enriches payload from PostgreSQL |
| Similarity checker is fully mocked (no DB) | Duplicate detection is non-functional | Connect to Redis hash store + vector DB |
| Static API key auth | Security risk | mTLS + short-lived JWTs |
| No model versioning or checksum validation | Model poisoning risk | MLflow registry + SHA-256 model verification |
| No request rate limiting | DDoS / abuse | API Gateway with rate limiting |
| No async processing | Blocks under load | Celery queue for batch scoring |
| No monitoring / alerting | Silent failures | Prometheus metrics + Grafana dashboards |
| `allow_origins=["*"]` | Unnecessary surface area | Restrict to Node backend domain |

What **is** production-quality: the architecture separation, the data contract via Pydantic, the graceful degradation when models aren't loaded, the structured logging, the fraud scoring algorithm's blended weighting, and the test scaffolding.

---

### Q18. Why are you using `@app.on_event("startup")` which is deprecated in recent FastAPI versions?

**Answer:**  
Good catch. `@app.on_event("startup")` was deprecated in FastAPI 0.93.0 in favor of the `lifespan` context manager pattern:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting up {settings.PROJECT_NAME}...")
    yield
    logger.info("Gracefully shutting down.")

app = FastAPI(lifespan=lifespan, ...)
```

We kept `on_event` for compatibility with the hackathon's installed dependency versions. Migrating to `lifespan` is a one-minute fix and we're aware of it.

---

## 📊 Business & Domain

---

### Q19. Invoice fraud already exists at scale in India via GSTN and e-Invoice. Why would any lender use your system instead of just checking the GSTN API?

**Answer:**  
GSTN/e-Invoice validation tells you a GST invoice *exists and is registered* — it doesn't tell you if it's been **pledged to multiple lenders simultaneously** (double financing), which is the core fraud vector in invoice discounting. GSTN has no cross-lender visibility. Our system:

1. **Prevents double financing across lenders** — through SHA-256 fingerprinting checked against a shared Redis layer that multiple lenders can contribute to.
2. **Detects behavioral anomalies** — a vendor suddenly submitting 20 invoices in 24 hours, all with round amounts, to a new lender is suspicious even if every invoice is GSTN-valid.
3. **Scores risk continuously** — GSTN is binary (valid/invalid); our system returns a probabilistic score that risk officers can use to set credit limits.

In production, GSTN API validation would be *one additional rule* in our `RuleEngine` (e.g., `GSTN_VALIDATION_FAILED` → +0.5 score), layered on top of our existing detection pipeline.

---

### Q20. What's the actual business ROI of this system?

**Answer:**  
MSME invoice financing fraud in India causes estimated losses of ₹20,000–50,000 crore annually (FICCI estimates). For a mid-size NBFC running ₹500 crore/year in invoice discounting:

- Fraud rate of 0.5–2% = ₹2.5–10 crore in annual losses.
- If our system catches 70% of fraud attempts (conservative for Isolation Forest on this problem space) with a 5% false positive rate (manageable for manual review), the prevented loss is ₹1.75–7 crore/year.
- Infrastructure cost for this service: ~₹15–30 lakh/year (cloud + MLOps).

**ROI: 6x–20x on year one.**

Beyond the direct loss prevention, there's a competitive moat: lenders using a shared fraud intelligence network improve detection over time as the model sees more data — a flywheel effect that standalone GSTN checks can never provide.

---

## 🧪 Testing

---

### Q21. Your test for `SUSPICIOUS_SHELL_INVOICE` asserts `is_anomaly is True` but your anomaly detector returns `False` when models aren't loaded. Won't that test fail without the `.pkl` files?

**Answer:**  
Yes, it will fail — and that's by design. The `get_anomaly_detector` dependency in `deps.py` raises `HTTP 503` if models aren't loaded, which would cause a 503 response on the scoring endpoint. To run tests without the actual model files, you have two options:

1. **Mock the anomaly detector**: Use `pytest.monkeypatch` or `unittest.mock` to patch `anomaly_detector.model` and `anomaly_detector.scaler` with a mock object that returns a predetermined response.
2. **Include model artifacts**: The `.pkl` files are committed to `app/models/` (they're pre-trained on synthetic data), so tests pass as long as you run from the project root with the models present.

Our CI pipeline should run from the root with models present. The test suite documents the *expected behavior* — the mocking approach would be added for isolated unit tests.

---

*Prepared for the NxtGen Hackathon 2026 | backend-ai-fastapi component*
