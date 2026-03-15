export const LAB_TYPES = {
  WHITE_BOX: "white_box",
  BLACK_BOX: "black_box",
  ACCESS_CONTROL: "access_control",
};

export const LAB_TYPE_DETAILS = {
  [LAB_TYPES.WHITE_BOX]: {
    name: "WHITE_BOX_TESTING",
    description: "Full source code and system knowledge provided",
    icon: "📄",
    color: "from-blue-600 to-cyan-600",
    subtitle: "SOURCE_CODE_ANALYSIS",
  },
  [LAB_TYPES.BLACK_BOX]: {
    name: "BLACK_BOX_TESTING",
    description: "No internal knowledge - external penetration testing",
    icon: "🔍",
    color: "from-purple-600 to-pink-600",
    subtitle: "EXTERNAL_PENETRATION",
  },
  [LAB_TYPES.ACCESS_CONTROL]: {
    name: "BROKEN_ACCESS_CONTROL",
    description: "Bypass authorization, exploit IDOR and privilege escalation",
    icon: "🔓",
    color: "from-amber-600 to-orange-600",
    subtitle: "AUTHORIZATION_BYPASS",
  },
};
