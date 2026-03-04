from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(tags=["skill-gap"])

DEPRECATED_DETAIL = {
    "error": "deprecated",
    "message": "This ML endpoint has been retired. Use /intelligence/salary-predictor.",
}


@router.post("/skill-gap/analyze")
async def skill_gap_analyze():
    return JSONResponse(DEPRECATED_DETAIL, status_code=410)


@router.get("/skill-gap/roles")
async def skill_gap_roles():
    return JSONResponse(DEPRECATED_DETAIL, status_code=410)