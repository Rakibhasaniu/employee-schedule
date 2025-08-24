export const getTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    vacation: '#3498db',
    sick: '#e74c3c',
    personal: '#f39c12',
    emergency: '#e67e22',
    bereavement: '#34495e',
    maternity: '#e91e63',
    paternity: '#9c27b0',
  };
  return colors[type] || '#95a5a6';
};