using UnityEngine;
using System.Collections;

public class LeaderBoardLevelItem : MonoBehaviour {

	public int LevelID;
	UISprite sprite;

	void Awake() {
		sprite = GetComponent<UISprite> ();
	}

	public void Refresh() {
		sprite.spriteName = "Level" + LevelID.ToString ();
	}
	

	public void ClickFunction() {
		LeaderBoard CurrentLeaderBoard = GameObject.FindGameObjectWithTag ("MainLeaderboard").GetComponent<LeaderBoard> ();
		CurrentLeaderBoard.LevelID = LevelID;
		CurrentLeaderBoard.LoadDefault ();
	}

}
