import Phaser from 'phaser';
import { gameConfig } from './config/GameConfig';
import { ambientAudio } from './systems/AmbientAudioSystem';
import './style.css';

const game = new Phaser.Game(gameConfig);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    ambientAudio.destroy();
    game.destroy(true);
  });
}
