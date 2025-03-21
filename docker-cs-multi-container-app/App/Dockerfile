FROM mcr.microsoft.com/dotnet/sdk:9.0@sha256:d7f4691d11f610d9b94bb75517c9e78ac5799447b5b3e82af9e4625d8c8d1d53 as build
WORKDIR /app

COPY *.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Debug -o out

FROM mcr.microsoft.com/dotnet/aspnet:9.0@sha256:4f0ad314f83e6abeb6906e69d0f9c81a0d2ee51d362e035c7d3e6ac5743f5399
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "App.dll"]