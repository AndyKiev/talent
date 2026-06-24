from fastapi import APIRouter


router = APIRouter(prefix="/base_router", tags=["Test base router"])


@router.get("/")
def root():
    return {"message": "Talent APi is running"}
