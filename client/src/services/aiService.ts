import { aiFeedback, generateQuestion, simplifyQuestion } from './api';

export const AiService = {
  simplify: simplifyQuestion,
  feedback: aiFeedback,
  generateQuestion,
};
