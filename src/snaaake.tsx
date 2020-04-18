import 'modern-normalize';
import React, { Component } from 'react';
import { Canvas, CanvasSettings } from './engine/canvas';
import {
  SnakeMachine,
  SnakeMachineState,
  createSnakeMachine,
} from './snake/snake-machine';
import {
  Apples,
  Bounds,
  Snake,
  willExceedBounds,
  willEatApple,
  willHitItself,
  moveSnake,
  growSnake,
  getInitialSnakeState,
  addApple,
} from './snake/snake';
import { drawScene } from './snake/draw-snake';
import { bindKeys } from './engine/keyboard';
import { createTimer } from './engine/timer';

export class Snaaake extends Component<
  CanvasSettings,
  {
    game: {
      apples: Apples;
      bounds: Bounds;
      snake: Snake;
    };
    status: SnakeMachineState<Apples, Bounds, Snake>;
  }
> {
  private snakeMachine: SnakeMachine<Apples, Bounds, Snake>;

  constructor(props: CanvasSettings) {
    super(props);

    const game = getInitialSnakeState(props);

    this.state = {
      game,
      status: 'idle',
    };

    this.snakeMachine = createSnakeMachine<Apples, Bounds, Snake>({
      initialData: game,
      resetData: () => getInitialSnakeState(props),
      updateApples: addApple,
      willExceedBounds,
      willEatApple,
      willHitItself,
      move: moveSnake,
      grow: growSnake,
      onUpdate: ({ apples, snake, state }) => {
        this.setState({
          game: {
            ...this.state.game,
            apples,
            snake,
          },
          status: state,
        });
      },
    });

    bindKeys({
      element: window,
      handlers: new Map([
        [
          [' '],
          {
            down: () => {
              this.snakeMachine.send('SPACE');
            },
          },
        ],
        [
          ['Escape'],
          {
            down: () => {
              this.snakeMachine.send('ESCAPE');
            },
          },
        ],
        [
          ['w', 'ArrowUp'],
          {
            down: () => {
              this.snakeMachine.send('UP');
            },
          },
        ],
        [
          ['d', 'ArrowRight'],
          {
            down: () => {
              this.snakeMachine.send('RIGHT');
            },
          },
        ],
        [
          ['s', 'ArrowDown'],
          {
            down: () => {
              this.snakeMachine.send('DOWN');
            },
          },
        ],
        [
          ['a', 'ArrowLeft'],
          {
            down: () => {
              this.snakeMachine.send('LEFT');
            },
          },
        ],
      ]),
    });
  }

  componentDidMount() {
    createTimer({
      step: 1 / 8,
      onTick: () => {
        this.snakeMachine.send('TICK');
      },
    });
  }

  render() {
    return (
      <div>
        <h1>🅂🄽🄰🄰🄰🄺🄴</h1>
        <p className="score">{this.state.game.snake.length - 1}</p>
        <Canvas
          settings={this.props}
          state={this.state.game}
          draw={drawScene}
        />
        <p className="status">{this.state.status}</p>
        <ul className="instructions">
          {this.state.status === 'idle' ? (
            <li>
              Hit <kbd>↑</kbd>, <kbd>→</kbd>, <kbd>↓</kbd> or <kbd>←</kbd> to
              get moving
            </li>
          ) : this.state.status === 'moving' ? (
            <li>
              Hit <kbd>Space</kbd> to pause
            </li>
          ) : this.state.status === 'paused' ? (
            <li>
              Hit <kbd>Space</kbd> to resume or <kbd>Escape</kbd> to restart
            </li>
          ) : (
            <li>
              Hit <kbd>Space</kbd> to restart
            </li>
          )}
        </ul>
      </div>
    );
  }
}
