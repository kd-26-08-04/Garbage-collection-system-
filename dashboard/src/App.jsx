import React, { useState, useEffect, useCallback } from "react";
import { Bell, TrendingUp, Activity, AlertCircle, RefreshCcw } from "lucide-react";
import axios from "axios";
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const containerStyle = {
    width: '100%',
    height: '100%'
};

const defaultCenter = {
    lat: 20.5937,
    lng: 78.9629
};

const StatCard = ({ icon, title, value, change, color, loading }) => {
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl rounded-2xl p-6 flex flex-col gap-2 transition hover:scale-105 duration-300">
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${color}`}>
                {icon}
            </div>
            <h3 className="text-gray-200 text-sm">{title}</h3>
            {loading ? (
                <div className="h-8 w-16 bg-white/20 animate-pulse rounded"></div>
            ) : (
                <h2 className="text-2xl font-bold text-white">{value}</h2>
            )}
            <p className="text-green-400 text-sm">{change}</p>
        </div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        cleaned: 0,
        detected: 0,
        today_activity: 0
    });
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY
    });

    const [map, setMap] = useState(null);

    const onLoad = useCallback(function callback(map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map) {
        setMap(null);
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [summaryRes, reportsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/reports/summary`),
                axios.get(`${API_BASE_URL}/reports/`)
            ]);
            setStats(summaryRes.data);
            setReports(reportsRes.data);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (reportId, newStatus) => {
        try {
            await axios.put(`${API_BASE_URL}/reports/${reportId}/status?status=${newStatus}`);
            fetchData();
        } catch (error) {
            console.error("Error updating report status:", error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Center map on the latest report if available
    const center = reports.length > 0 ? {
        lat: reports[0].latitude,
        lng: reports[0].longitude
    } : defaultCenter;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 text-white">

            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
                    <button
                        onClick={fetchData}
                        className={`p-2 rounded-full hover:bg-white/10 transition ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                </div>
                <div className="relative">
                    <Bell className="w-6 h-6 text-white" />
                    <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full"></span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={<AlertCircle className="text-blue-400" />}
                    title="Total Reports"
                    value={stats.total}
                    change="Overall"
                    color="bg-blue-500/20"
                    loading={loading}
                />
                <StatCard
                    icon={<TrendingUp className="text-yellow-400" />}
                    title="Pending"
                    value={stats.pending}
                    change="To be cleaned"
                    color="bg-yellow-500/20"
                    loading={loading}
                />
                <StatCard
                    icon={<Activity className="text-green-400" />}
                    title="Today's Activity"
                    value={stats.today_activity}
                    change="Last 24h"
                    color="bg-green-500/20"
                    loading={loading}
                />
                <StatCard
                    icon={<Activity className="text-purple-400" />}
                    title="Cleaned"
                    value={stats.cleaned}
                    change="Resolved"
                    color="bg-purple-500/20"
                    loading={loading}
                />
            </div>

            {/* Live Monitoring Panel */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Live Monitoring</h2>
                    <span className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded-full">
                        ● {loading ? 'Syncing...' : 'Active'}
                    </span>
                </div>

                {/* Map Area */}
                <div className="relative h-96 rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center">
                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={containerStyle}
                            center={center}
                            zoom={10}
                            onLoad={onLoad}
                            onUnmount={onUnmount}
                            options={{
                                styles: [
                                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                                ]
                            }}
                        >
                            {reports.map((report) => (
                                <Marker
                                    key={report._id}
                                    position={{ lat: report.latitude, lng: report.longitude }}
                                    title={`Confidence: ${Math.round(report.confidence_score * 100)}%`}
                                    icon={report.status === 'cleaned' ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'}
                                />
                            ))}
                        </GoogleMap>
                    ) : (
                        <div className="text-gray-500 italic flex flex-col items-center gap-2">
                            <Activity className="animate-spin w-8 h-8" />
                            Loading Interactive Map...
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Reports */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Recent Reports</h2>
                    <button className="text-blue-400 hover:underline">View All</button>
                </div>

                <div className="grid gap-4">
                    {reports.length > 0 ? reports.slice(0, 10).map((report) => (
                        <div key={report._id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition">
                            <img
                                src={report.image_url.startsWith('http') ? report.image_url : `${API_BASE_URL}${report.image_url}`}
                                alt="report"
                                className="w-16 h-16 rounded-lg object-cover bg-gray-800"
                                onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=No+Image"; }}
                            />
                            <div className="flex-1">
                                <h3 className="font-semibold">Report #{report._id.slice(-4)}</h3>
                                <p className="text-gray-400 text-sm">
                                    {new Date(report.timestamp).toLocaleString()}
                                </p>
                                <p className="text-gray-400 text-xs text-blue-400">
                                    Confidence: {Math.round(report.confidence_score * 100)}%
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${report.status === 'cleaned' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {report.status.toUpperCase()}
                                </span>
                                {report.status === 'pending' && (
                                    <button
                                        onClick={() => handleStatusUpdate(report._id, 'cleaned')}
                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition"
                                    >
                                        Mark Cleaned
                                    </button>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 text-center text-gray-500 italic">
                            No reports found in the database.
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Button */}
            <button className="fixed bottom-6 right-6 w-16 h-16 bg-blue-500 hover:bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-2xl transition hover:scale-110 active:scale-95">
                📷
            </button>
        </div>
    );
};

export default Dashboard;
