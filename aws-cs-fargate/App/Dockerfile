FROM mcr.microsoft.com/dotnet/core/sdk:3.1@sha256:150d074697d1cda38a0c2185fe43895d84b5745841e9d15c5adba29604a6e4cb AS build
WORKDIR /app/src

# First restore dependencies so app changes are faster.
COPY *.csproj .
RUN dotnet restore

# Next copy the rest of the app and build it.
COPY * ./
RUN dotnet publish -c release -o /app/bin --no-restore

# Create a new, smaller image stage, that just runs the DLL.
FROM mcr.microsoft.com/dotnet/core/aspnet:3.1@sha256:e3b773f30a0a6e88d71ce52429f6847627fc9353e491346902ca345760b82bdd
WORKDIR /app
COPY --from=build /app/bin ./
ENTRYPOINT [ "dotnet", "aws-cs-fargate.dll" ]
