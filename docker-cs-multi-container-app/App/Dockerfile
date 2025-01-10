FROM mcr.microsoft.com/dotnet/sdk:5.0@sha256:3ff465d940de3e2c727794d92fd7bb649c498d4abd91bc9213ea7831ebf01f1e as build
WORKDIR /app

COPY *.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Debug -o out

FROM mcr.microsoft.com/dotnet/aspnet:5.0@sha256:1a7d811242f001673d5d25283b3af03da526de1ee8d3bb5aa295f480b7844d44
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "App.dll"]