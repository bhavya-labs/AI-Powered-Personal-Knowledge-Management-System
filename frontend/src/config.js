// Dynamic API base URL configuration
export const getApiBaseUrl = () => {
    return localStorage.getItem("mindmesh_api_url") || import.meta.env.VITE_API_BASE_URL || "https://ai-powered-personal-knowledge-management-50eh.onrender.com";
};
