from pydantic import BaseModel

class Alert(BaseModel):
    type: str
    confidence: float
    label: str
    image: str
    timestamp: str
    seen: bool = False  
