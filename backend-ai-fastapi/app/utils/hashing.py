import hashlib
import json
from typing import Any

def generate_invoice_hash(invoice_data: dict[str, Any]) -> str:
    data_to_hash = {k: v for k, v in invoice_data.items() if k != 'invoice_hash'}
    json_str = json.dumps(data_to_hash, sort_keys=True, separators=(',', ':'), default=str)
    return hashlib.sha256(json_str.encode('utf-8')).hexdigest()
