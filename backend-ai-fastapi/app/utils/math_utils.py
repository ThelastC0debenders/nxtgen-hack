import numpy as np

def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """
    Computes the cosine similarity between two 1D numpy arrays.
    Useful for comparing numerical feature vectors of invoices.
    """
    if vec1.shape != vec2.shape:
        raise ValueError(f"Vectors must have the same shape. Got {vec1.shape} and {vec2.shape}.")
        
    dot_product = np.dot(vec1, vec2)
    norm_vec1 = np.linalg.norm(vec1)
    norm_vec2 = np.linalg.norm(vec2)
    
    if norm_vec1 == 0 or norm_vec2 == 0:
        return 0.0
        
    # Floating point precision can sometimes result in numbers slightly above 1.0 or below -1.0
    return float(np.clip(dot_product / (norm_vec1 * norm_vec2), -1.0, 1.0))

def jaccard_similarity(set1: set, set2: set) -> float:
    """
    Computes the Jaccard similarity coefficient between two sets.
    Useful for comparing categorical traits like lists of item descriptions.
    """
    if not set1 and not set2:
        return 1.0 # Both sets are empty, so they are identical
        
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    
    return float(intersection / union)
