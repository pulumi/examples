FROM python:3.10-slim
RUN mkdir /opt/project
WORKDIR /opt/project
COPY ./requirements.txt .
RUN pip install --no-cache-dir -U pip wheel && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf requirements.txt
COPY app ./app/
ENV PYTHONPATH "${PYTHONPATH}:/opt/project"
CMD ["python", "app/main.py"]
