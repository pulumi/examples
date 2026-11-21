FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY static ./static

# Numeric USER: Kubernetes' runAsNonRoot check can only verify a numeric UID.
RUN useradd --create-home --uid 10001 app
USER 10001

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
