from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(tags=["clustering"])

DEPRECATED_DETAIL = {
    "error": "deprecated",
    "message": "This ML endpoint has been retired. Use /intelligence/salary-predictor.",
}


@router.get("/clusters")
async def clusters():
    return JSONResponse(DEPRECATED_DETAIL, status_code=410)


@router.get("/clusters/adjacent/{slug}")
async def adjacent_roles(slug: str):
    _ = slug
    return JSONResponse(DEPRECATED_DETAIL, status_code=410)