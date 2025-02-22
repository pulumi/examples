FROM mcr.microsoft.com/dotnet/sdk:9.0@sha256:7f8e8b1514a2eeccb025f1e9dd554e191b21afa7f43f8321b7bd2009cdd59a1d as build
WORKDIR /app

COPY *.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Debug -o out

FROM mcr.microsoft.com/dotnet/aspnet:9.0@sha256:adc89f84d53514cdc17677f3334775879d80d08ac8997a4b3fba8d20a6d6de9d
WORKDIR /app
COPY --from=build /app/out .
ENTRYPOINT ["dotnet", "App.dll"]