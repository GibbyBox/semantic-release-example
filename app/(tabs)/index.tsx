import { difficulties, gameReducer, Minesweeper, startGame } from "minesweeper-redux";
import { useReducer } from "react";
import { StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { View, Text } from "../../components/Themed";

const INITIAL_STATE: Minesweeper = {
	difficulty: { height: 1, width: 1, numMines: 1 },
	status: 'waiting',
	numCells: 1,
	grid: [],
	numFlagged: 0,
	remainingFlags: 1,
	randSeed: 0,
	elapsedTime: 0,
}

export default function MinesweeperScreen() {
	const [ minesweeper, dispatch ] = useReducer(gameReducer, INITIAL_STATE);
	const isInitial = minesweeper === INITIAL_STATE;

	function start() {
		dispatch(startGame({
			difficulty: difficulties.easy,
			randSeed: Math.random(),
		}))
	}

  return (
    <View style={styles.root}>
			{ isInitial ? (
				<Button mode="contained" onPress={start}>
					Start
				</Button>
			) : (
				<Text>
					{ JSON.stringify(minesweeper) }
				</Text>
			)}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
