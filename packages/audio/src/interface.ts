export enum EN_INSTRUMENT_TYPE {
  PIANO = "piano",
  SYNTH = "synth",
  GUITAR = "guitar",
  DISTORTION_GUITAR = "distortion_guitar",
  DRUM = "drum",
}

/**
 * 乐器类型到 SoundFont 音色名称的映射
 */
export const INSTRUMENT_MAP: Record<EN_INSTRUMENT_TYPE, string> = {
  [EN_INSTRUMENT_TYPE.PIANO]: "acoustic_grand_piano",
  [EN_INSTRUMENT_TYPE.SYNTH]: "lead_1_square",
  [EN_INSTRUMENT_TYPE.GUITAR]: "acoustic_guitar_nylon",
  [EN_INSTRUMENT_TYPE.DISTORTION_GUITAR]: "distortion_guitar",
  [EN_INSTRUMENT_TYPE.DRUM]: "percussion",
};
