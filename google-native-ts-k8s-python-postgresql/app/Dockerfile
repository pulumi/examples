FROM python:3.13-slim@sha256:83509a63d2c432e365bdc7a015948a77952a23d7784a632ba741baf3ba1862cb
RUN mkdir /opt/project
WORKDIR /opt/project
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./app ./app/
COPY ./VERSION.txt .
ENV PYTHONPATH "${PYTHONPATH}:/opt/project"
CMD ["python", "app/main.py"]
