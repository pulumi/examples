FROM mcr.microsoft.com/dotnet/core/sdk:3.1 AS build-env
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY src/SampleApplication.Web/*.csproj ./src/SampleApplication.Web/
COPY SampleApplication.sln ./
RUN dotnet restore ./SampleApplication.sln

# Copy everything else and build
COPY src ./src
RUN dotnet publish ./SampleApplication.sln -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/core/aspnet:3.1
WORKDIR /app
COPY --from=build-env /app/out .
ENTRYPOINT ["dotnet", "SampleApplication.Web.dll"]
