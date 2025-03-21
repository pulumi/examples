FROM mcr.microsoft.com/dotnet/sdk@sha256:d7f4691d11f610d9b94bb75517c9e78ac5799447b5b3e82af9e4625d8c8d1d53 AS base

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