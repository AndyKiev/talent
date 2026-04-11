from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Talent APi is running"}