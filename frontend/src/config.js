// Dynamic API base URL configuration
export const getApiBaseUrl = () => {
  return localStorage.getItem("mindmesh_api_url") || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
};
