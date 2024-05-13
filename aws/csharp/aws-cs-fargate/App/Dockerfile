FROM mcr.microsoft.com/dotnet/core/sdk:3.1 AS build
WORKDIR /app/src

# First restore dependencies so app changes are faster.
COPY *.csproj .
RUN dotnet restore

# Next copy the rest of the app and build it.
COPY * ./
RUN dotnet publish -c release -o /app/bin --no-restore

# Create a new, smaller image stage, that just runs the DLL.
FROM mcr.microsoft.com/dotnet/core/aspnet:3.1
WORKDIR /app
COPY --from=build /app/bin ./
ENTRYPOINT [ "dotnet", "aws-cs-fargate.dll" ]
