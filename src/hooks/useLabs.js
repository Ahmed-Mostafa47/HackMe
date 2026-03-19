import { useState } from "react";

export const useLabs = () => {
  const [selectedLabType, setSelectedLabType] = useState(null);

  return {
    selectedLabType,
    setSelectedLabType,
  };
};
