import { useState } from "react";
import { mockLabs, mockChallenges, mockSubmissions } from "../data/mockData";
import { LAB_TYPES } from "../data/labTypes";

export const useLabs = () => {
  const [selectedLabType, setSelectedLabType] = useState(null);
  const [selectedLab, setSelectedLab] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  const getLabsByType = (labType) => {
    if (!labType) return [];
    return mockLabs.filter(
      (lab) => lab.labtype_id === (labType === LAB_TYPES.WHITE_BOX ? 1 : 2)
    );
  };

  const getChallengesByLab = (labId) => {
    return mockChallenges.filter((challenge) => challenge.lab_id === labId);
  };

  const getLabProgress = (labId) => {
    const labSubmissions = mockSubmissions.filter((sub) => {
      const challenge = mockChallenges.find(
        (c) => c.challenge_id === sub.challenge_id
      );
      return challenge && challenge.lab_id === labId;
    });

    const totalPoints = mockChallenges
      .filter((c) => c.lab_id === labId)
      .reduce((sum, challenge) => sum + challenge.max_score, 0);

    const earnedPoints = labSubmissions.reduce(
      (sum, sub) => sum + sub.final_score,
      0
    );

    return {
      progress:
        totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0,
      earnedPoints,
      totalPoints,
    };
  };

  const submitFlag = (challengeId, flag) => {
    const challenge = mockChallenges.find(
      (c) => c.challenge_id === challengeId
    );
    if (!challenge) return { success: false, message: "Challenge not found" };

    const testcase = challenge.testcases.find(
      (tc) => tc.secret_flag_plain === flag
    );

    if (testcase) {
      // In a real app, you would update the backend here
      return {
        success: true,
        message: "FLAG_CAPTURED",
        points: testcase.points,
      };
    } else {
      return {
        success: false,
        message: "INVALID_FLAG",
      };
    }
  };

  return {
    selectedLabType,
    setSelectedLabType,
    selectedLab,
    setSelectedLab,
    selectedChallenge,
    setSelectedChallenge,
    getLabsByType,
    getChallengesByLab,
    getLabProgress,
    submitFlag,
  };
};
