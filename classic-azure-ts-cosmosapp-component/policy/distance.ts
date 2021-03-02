// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

interface Region {
    latitude: number;
    longitude: number;
    name: string;
}

const regionsJson: Region[] = require("./azureRegions.json");

export function distanceBetweenRegions(nameA: string, nameB: string) {
    const regionA = regionsJson.find(r => r.name === nameA);
    if (!regionA) {
        throw new Error(`Region ${nameA} is not found`);
    }

    const regionB = regionsJson.find(r => r.name === nameB);
    if (!regionB) {
        throw new Error(`Region ${nameB} is not found`);
    }

    return getDistanceFromLatLonInKm(regionA.latitude, regionA.longitude, regionB.latitude, regionB.longitude);
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2-lat1);
    const dLon = deg2rad(lon2-lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c); // Distance in km
}

function deg2rad(deg: number) {
    return deg * (Math.PI/180);
}
