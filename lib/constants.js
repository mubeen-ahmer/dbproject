export const ACADEMIC_LEVELS = [
  { value: 'HIGH_SCHOOL', label: 'High School' },
  { value: 'UNDERGRADUATE', label: 'Undergraduate' },
  { value: 'MASTERS', label: 'Masters' },
  { value: 'PHD', label: 'PhD' },
];

export const CITATION_STYLES = [
  { value: 'NONE', label: 'None' },
  { value: 'APA', label: 'APA' },
  { value: 'MLA', label: 'MLA' },
  { value: 'HARVARD', label: 'Harvard' },
  { value: 'CHICAGO', label: 'Chicago' },
];

export const ORDER_STATUS_STYLES = {
  OPEN: 'bg-blue-500/20 text-blue-300',
  BIDDING: 'bg-blue-500/20 text-blue-300',
  ASSIGNED: 'bg-indigo-500/20 text-indigo-300',
  IN_PROGRESS: 'bg-indigo-500/20 text-indigo-300',
  SUBMITTED: 'bg-yellow-500/20 text-yellow-300',
  UNDER_REVIEW: 'bg-yellow-500/20 text-yellow-300',
  REVISION_REQUESTED: 'bg-orange-500/20 text-orange-300',
  COMPLETED: 'bg-green-500/20 text-green-300',
  DISPUTED: 'bg-red-500/20 text-red-300',
  CANCELLED: 'bg-gray-500/20 text-gray-300',
  REFUNDED: 'bg-gray-500/20 text-gray-300',
};
