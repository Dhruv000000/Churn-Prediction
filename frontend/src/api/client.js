import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getWarehouseKPIs = async () => {
  const response = await api.get('/api/dwh/kpis');
  return response.data;
};

export const getContractAnalysis = async () => {
  const response = await api.get('/api/dwh/contract-analysis');
  return response.data;
};

export const getPaymentAnalysis = async () => {
  const response = await api.get('/api/dwh/payment-analysis');
  return response.data;
};

export const getClusters = async (sampleSize = 1000) => {
  const response = await api.get(`/api/mining/clusters?sample_size=${sampleSize}`);
  return response.data;
};

export const getElbowCurve = async () => {
  const response = await api.get('/api/mining/elbow');
  return response.data;
};

export const getModelMetrics = async (modelName = null) => {
  const url = modelName
    ? `/api/mining/metrics?model=${encodeURIComponent(modelName)}`
    : '/api/mining/metrics';
  const response = await api.get(url);
  return response.data;
};

export const predictCustomer = async (customerData) => {
  const response = await api.post('/api/mining/predict', customerData);
  return response.data;
};

export const retrainPipeline = async () => {
  const response = await api.post('/api/mining/retrain');
  return response.data;
};

// -----------------------------------------------------------------------------
// APRIORI MARKET BASKET & PATTERN MINING APIS
// -----------------------------------------------------------------------------
export const getAprioriSummary = async () => {
  const response = await api.get('/api/mining/apriori/summary');
  return response.data;
};

export const runApriori = async ({ min_support, min_confidence, max_len }) => {
  const response = await api.post('/api/mining/apriori/run', {
    min_support: Number(min_support),
    min_confidence: Number(min_confidence),
    max_len: Number(max_len),
  });
  return response.data;
};

export const getFrequentItemsets = async ({ min_size = 1, max_size = 5, limit = 100 } = {}) => {
  const response = await api.get(
    `/api/mining/apriori/itemsets?min_size=${min_size}&max_size=${max_size}&limit=${limit}`
  );
  return response.data;
};

export const getAssociationRules = async ({ min_lift = 1.0, min_confidence = 0.0, limit = 100 } = {}) => {
  const response = await api.get(
    `/api/mining/apriori/rules?min_lift=${min_lift}&min_confidence=${min_confidence}&limit=${limit}`
  );
  return response.data;
};

export const getChurnRules = async () => {
  const response = await api.get('/api/mining/apriori/churn-rules');
  return response.data;
};

export const getServiceRecommendations = async (activeServices, minConfidence = 0.35, minLift = 1.05) => {
  const response = await api.post('/api/mining/apriori/recommend', {
    active_services: activeServices,
    min_confidence: minConfidence,
    min_lift: minLift,
  });
  return response.data;
};

export const getExportItemsetsUrl = () => `${API_BASE}/api/mining/apriori/export/itemsets`;
export const getExportRulesUrl = () => `${API_BASE}/api/mining/apriori/export/rules`;

export default api;
