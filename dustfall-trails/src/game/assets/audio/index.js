import battleMusicUrl from '../music/bfcmusic-wild-west-never-sleeps-246672.mp3';
import titleTrailMusicUrl from '../music/idoberg-instrumental-wild-west-type-song-392804.mp3';
import townMusicUrl from '../music/playlistsons-wild-west-466301.mp3';
import stanceGunslingerUrl from './stance-gunslinger.wav';
import stanceIronRiderUrl from './stance-iron-rider.wav';
import stanceOutlawUrl from './stance-outlaw.wav';
import stanceSharpshooterUrl from './stance-sharpshooter.wav';
import stanceWranglerUrl from './stance-wrangler.wav';

export const voiceAssets = [
  { key: 'voice-stance-gunslinger', url: stanceGunslingerUrl },
  { key: 'voice-stance-iron-rider', url: stanceIronRiderUrl },
  { key: 'voice-stance-outlaw', url: stanceOutlawUrl },
  { key: 'voice-stance-sharpshooter', url: stanceSharpshooterUrl },
  { key: 'voice-stance-wrangler', url: stanceWranglerUrl },
];

export const stanceVoiceKeys = {
  Gunslinger: 'voice-stance-gunslinger',
  'Iron Rider': 'voice-stance-iron-rider',
  Outlaw: 'voice-stance-outlaw',
  Sharpshooter: 'voice-stance-sharpshooter',
  Wrangler: 'voice-stance-wrangler',
};

export const musicAssets = [
  { key: 'music-battle', url: battleMusicUrl },
  { key: 'music-title-trail', url: titleTrailMusicUrl },
  { key: 'music-town', url: townMusicUrl },
];

export const musicKeys = {
  battle: 'music-battle',
  titleTrail: 'music-title-trail',
  town: 'music-town',
};
