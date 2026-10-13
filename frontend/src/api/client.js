import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
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

export const getModelMetrics = async () => {
  const response = await api.get('/api/mining/metrics');
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

export default api;
