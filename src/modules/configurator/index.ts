export { Configurator } from './components/site/Configurator';
export { buildStructure, computeSegments, heightAtX, slopePoint, type Structure, type Member, type Panel, type ProfileKey, type MemberGroup } from './domain/structure';
export { clampParams, parseParams, serializeParams, DEFAULT_PARAMS, DEFAULT_LIMITS, type Params, type Limits } from './domain/params';
export { SECTIONS, DEFAULT_PROFILE_MAP, sectionFor } from './domain/profiles';
export { getCachedRules, DEFAULT_RULES, type ConfiguratorRules } from './data/rulesRepository';
