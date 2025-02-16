FROM python:3.10-slim@sha256:66aad90b231f011cb80e1966e03526a7175f0586724981969b23903abac19081
RUN mkdir /opt/project
WORKDIR /opt/project
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./app ./app/
COPY ./VERSION.txt .
ENV PYTHONPATH "${PYTHONPATH}:/opt/project"
CMD ["python", "app/main.py"]
