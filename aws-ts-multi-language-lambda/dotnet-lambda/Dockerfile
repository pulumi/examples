FROM mcr.microsoft.com/dotnet/sdk AS base

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