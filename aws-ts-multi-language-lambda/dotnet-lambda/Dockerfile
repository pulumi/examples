FROM mcr.microsoft.com/dotnet/sdk@sha256:1025bed126a7b85c56b960215ab42a99db97a319a72b5d902383ebf6c6e62bbe AS base

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