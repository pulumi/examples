FROM python:3.13-slim@sha256:f3614d98f38b0525d670f287b0474385952e28eb43016655dd003d0e28cf8652
RUN mkdir /opt/project
WORKDIR /opt/project
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./app ./app/
COPY ./VERSION.txt .
ENV PYTHONPATH "${PYTHONPATH}:/opt/project"
CMD ["python", "app/main.py"]
