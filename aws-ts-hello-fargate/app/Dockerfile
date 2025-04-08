# Use an official Python runtime as a parent image
FROM python:3.13-slim@sha256:83509a63d2c432e365bdc7a015948a77952a23d7784a632ba741baf3ba1862cb

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt
RUN pip install --trusted-host pypi.python.org -r requirements.txt

# Make port 80 available to the world outside this container
EXPOSE 80

# Define environment variable
ENV NAME World

# Run app.py when the container launches
CMD ["python", "app.py"]
