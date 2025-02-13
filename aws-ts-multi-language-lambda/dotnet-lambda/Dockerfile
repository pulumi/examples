FROM mcr.microsoft.com/dotnet/sdk@sha256:7f8e8b1514a2eeccb025f1e9dd554e191b21afa7f43f8321b7bd2009cdd59a1d AS base

WORKDIR /app

FROM base AS restore

COPY *.csproj .

RUN dotnet restore

FROM base AS builder

COPY --from=restore /app/*.csproj /app
COPY --from=restore /app/obj /app/obj
COPY Function.cs /app

RUN dotnet publish . -o dist

FROM scratch

COPY --from=builder /app/dist .