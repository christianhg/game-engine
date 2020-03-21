import {
  StateSchema,
  Machine,
  interpret,
  Interpreter,
  assign,
  StateValue,
} from 'xstate';
import { createTimer } from '../engine/timer';

interface SnakeStateSchema extends StateSchema {
  states: {
    idle: {};
    moving: {
      states: {
        up: {
          states: {
            locked: {};
            unlocked: {};
          };
        };
        right: {
          states: {
            locked: {};
            unlocked: {};
          };
        };
        down: {
          states: {
            locked: {};
            unlocked: {};
          };
        };
        left: {
          states: {
            locked: {};
            unlocked: {};
          };
        };
      };
    };
    dead: {};
    paused: {};
  };
}

type SnakeContext<TApples, TBounds, TSnake> = {
  bounds: TBounds;
  apples: TApples;
  snake: TSnake;
};

type SnakeEvent =
  | { type: 'UP' }
  | { type: 'RIGHT' }
  | { type: 'DOWN' }
  | { type: 'LEFT' }
  | { type: 'SPACE' }
  | { type: 'ESCAPE' }
  | { type: 'TICK' };

export type SnakeMachine<TApples, TBounds, TSnake> = Interpreter<
  SnakeContext<TApples, TBounds, TSnake>,
  SnakeStateSchema,
  SnakeEvent
>;

export enum Direction {
  up = 'up',
  right = 'right',
  down = 'down',
  left = 'left',
}

export type WillExceedBounds<TBounds, TSnake> = ({
  bounds,
  snake,
  direction,
}: {
  bounds: TBounds;
  snake: TSnake;
  direction: Direction;
}) => boolean;

export type WillHitItself<TSnake> = ({
  snake,
  direction,
}: {
  snake: TSnake;
  direction: Direction;
}) => boolean;

export type WillEatApple<TApples, TSnake> = ({
  apples,
  snake,
  direction,
}: {
  apples: TApples;
  snake: TSnake;
  direction: Direction;
}) => boolean;

export function createSnakeMachine<TApples, TBounds, TSnake>({
  context,
  willExceedBounds,
  willEatApple,
  willHitItself,
  move,
  grow,
  onUpdate,
}: {
  context: SnakeContext<TApples, TBounds, TSnake>;
  willExceedBounds: WillExceedBounds<TBounds, TSnake>;
  willEatApple: WillEatApple<TApples, TSnake>;
  willHitItself: WillHitItself<TSnake>;
  move: (snake: TSnake, direction: Direction) => TSnake;
  grow: ({
    apples,
    snake,
    direction,
  }: {
    apples: TApples;
    snake: TSnake;
    direction: Direction;
  }) => { apples: TApples; snake: TSnake };
  onUpdate: ({
    context,
    state,
  }: {
    context: SnakeContext<TApples, TBounds, TSnake>;
    state: StateValue;
  }) => void;
}): SnakeMachine<TApples, TBounds, TSnake> {
  const machine = Machine<
    SnakeContext<TApples, TBounds, TSnake>,
    SnakeStateSchema,
    SnakeEvent
  >(
    {
      id: 'snake',
      context,
      initial: 'idle',
      states: {
        idle: {
          on: {
            UP: { target: 'moving.up' },
            RIGHT: { target: 'moving.right' },
            DOWN: { target: 'moving.down' },
            LEFT: { target: 'moving.left' },
          },
        },
        moving: {
          on: {
            SPACE: {
              target: '#snake.paused',
            },
          },
          states: {
            up: {
              on: {
                TICK: [
                  { target: '#snake.dead', cond: 'boundUp' },
                  { target: '#snake.dead', cond: 'snakeUp' },
                  {
                    cond: 'appleUp',
                    target: '.unlocked',
                    actions: ['growUp'],
                  },
                  { target: '.unlocked', actions: ['moveUp'] },
                ],
              },
              initial: 'locked',
              states: {
                locked: {},
                unlocked: {
                  on: {
                    RIGHT: { target: '#snake.moving.right' },
                    LEFT: { target: '#snake.moving.left' },
                  },
                },
              },
            },
            right: {
              on: {
                TICK: [
                  { target: '#snake.dead', cond: 'boundRight' },
                  { target: '#snake.dead', cond: 'snakeRight' },
                  {
                    cond: 'appleRight',
                    target: '.unlocked',
                    actions: ['growRight'],
                  },
                  {
                    target: '.unlocked',
                    actions: ['moveRight'],
                  },
                ],
              },
              initial: 'locked',
              states: {
                locked: {},
                unlocked: {
                  on: {
                    UP: { target: '#snake.moving.up' },
                    DOWN: { target: '#snake.moving.down' },
                  },
                },
              },
            },
            down: {
              on: {
                TICK: [
                  { target: '#snake.dead', cond: 'boundDown' },
                  { target: '#snake.dead', cond: 'snakeDown' },
                  {
                    cond: 'appleDown',
                    target: '.unlocked',
                    actions: ['growDown'],
                  },
                  {
                    target: '.unlocked',
                    actions: ['moveDown'],
                  },
                ],
              },
              initial: 'locked',
              states: {
                locked: {},
                unlocked: {
                  on: {
                    RIGHT: { target: '#snake.moving.right' },
                    LEFT: { target: '#snake.moving.left' },
                  },
                },
              },
            },
            left: {
              on: {
                TICK: [
                  { target: '#snake.dead', cond: 'boundLeft' },
                  { target: '#snake.dead', cond: 'snakeLeft' },
                  {
                    cond: 'appleLeft',
                    target: '.unlocked',
                    actions: ['growLeft'],
                  },
                  {
                    target: '.unlocked',
                    actions: ['moveLeft'],
                  },
                ],
              },
              initial: 'locked',
              states: {
                locked: {},
                unlocked: {
                  on: {
                    UP: { target: '#snake.moving.up' },
                    DOWN: { target: '#snake.moving.down' },
                  },
                },
              },
            },
          },
        },
        dead: {
          on: {
            SPACE: { target: 'idle', actions: ['reset'] },
          },
        },
        paused: {
          on: {
            SPACE: { target: 'idle' },
            ESCAPE: { target: 'idle', actions: ['reset'] },
          },
        },
      },
    },
    {
      actions: {
        moveUp: assign({
          snake: ({ snake }) => move(snake, Direction.up),
        }),
        moveRight: assign({
          snake: ({ snake }) => move(snake, Direction.right),
        }),
        moveDown: assign({
          snake: ({ snake }) => move(snake, Direction.down),
        }),
        moveLeft: assign({
          snake: ({ snake }) => move(snake, Direction.left),
        }),

        growUp: assign({
          apples: ({ apples, snake }) =>
            grow({ apples, snake, direction: Direction.up }).apples,
          snake: ({ apples, snake }) =>
            grow({ apples, snake, direction: Direction.up }).snake,
        }),
        growRight: assign({
          apples: ({ apples, snake }) =>
            grow({ apples, snake, direction: Direction.right }).apples,
          snake: ({ apples, snake }) =>
            grow({ apples, snake, direction: Direction.right }).snake,
        }),
        growDown: assign({
          apples: ({ apples, snake }) =>
            grow({ apples, snake, direction: Direction.down }).apples,
          snake: ({ apples, snake }) =>
            grow({ apples, snake, direction: Direction.down }).snake,
        }),
        growLeft: assign({
          apples: ({ apples, snake }) =>
            grow({ apples, snake, direction: Direction.left }).apples,
          snake: ({ apples, snake }) =>
            grow({ apples, snake, direction: Direction.left }).snake,
        }),

        reset: assign({
          apples: ({ apples }) => context.apples,
          snake: ({ snake }) => context.snake,
        }),
      },
      guards: {
        appleUp: ({ apples, snake }) =>
          willEatApple({ apples, snake, direction: Direction.up }),
        appleRight: ({ apples, snake }) =>
          willEatApple({ apples, snake, direction: Direction.right }),
        appleDown: ({ apples, snake }) =>
          willEatApple({ apples, snake, direction: Direction.down }),
        appleLeft: ({ apples, snake }) =>
          willEatApple({ apples, snake, direction: Direction.left }),

        boundUp: ({ bounds, snake }) =>
          willExceedBounds({ bounds, snake, direction: Direction.up }),
        boundRight: ({ bounds, snake }) =>
          willExceedBounds({ bounds, snake, direction: Direction.right }),
        boundDown: ({ bounds, snake }) =>
          willExceedBounds({ bounds, snake, direction: Direction.down }),
        boundLeft: ({ bounds, snake }) =>
          willExceedBounds({ bounds, snake, direction: Direction.left }),

        snakeUp: ({ snake }) =>
          willHitItself({ snake, direction: Direction.up }),
        snakeRight: ({ snake }) =>
          willHitItself({ snake, direction: Direction.right }),
        snakeDown: ({ snake }) =>
          willHitItself({ snake, direction: Direction.down }),
        snakeLeft: ({ snake }) =>
          willHitItself({ snake, direction: Direction.left }),
      },
    }
  );

  const interpreter = interpret(machine)
    .start()
    .onTransition(state => {
      if (state.changed !== undefined) {
        onUpdate({ context: state.context, state: state.value });
      }
    });

  createTimer({
    step: 1 / 8,
    onTick: () => {
      interpreter.send('TICK');
    },
  })();

  return interpreter;
}
