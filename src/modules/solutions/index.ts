export { SolutionCard, SolutionDetail, SolutionsForService, SolutionsList } from './components/site/SolutionViews';
export { SolutionForm } from './components/admin/SolutionForm';
export { formatAdvantages, formatComparisonRows, parseAdvantages, parseComparisonRows, readAdvantages, readComparison, type Advantage, type Comparison, type ComparisonRow } from './domain/solutionLines';
export { getCachedSolutionBySlug, getCachedSolutionList, getCachedSolutionSlugs, resolveOldSolutionSlug, type SolutionCardData, type SolutionDetailData } from './data/solutionsRepository';
