from pydantic import BaseModel
from typing import List

class QWalkRequest(BaseModel):
    n_positions: int
    steps: int
    coin: str
    start_pos: int
    custom_coin_angles: List[float] = None
