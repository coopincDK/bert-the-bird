using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Linq;



public class LeaderBoard : MonoBehaviour {
	public GameObject LoginNotice;
	public GameObject LeaderBoardItemPrefab;
	public GameObject Crown;
	public int LevelID;
	public bool FriendsOnly;
	public bool Today;
	public GameObject LevelSelector;
	public UISprite CurrentLevelIcon;
	CachedScoreboard CurrentScoreboard = null;
	Transform ScrollView;
	GameObject ResultParent;
	int currentRank = 1;
	float CurrentPosition = 0;
	int Amount = 10;
	bool Altering = false;
	ScoreResult myScore = null;
	bool myScoreLoaded = false;


	// Use this for initialization
	void Start () {
		ScrollView = transform.FindChild ("Scroll View");
		ResultParent = ScrollView.transform.FindChild ("Container").gameObject;

	}

	void Reset() {
		ScrollView.GetComponent<UIScrollView> ().ResetPosition ();
		myScoreLoaded = false;
		LoadMyScore ();
		currentRank = 1;
		Altering = false;
		CurrentPosition = 0;
		foreach (Transform child in ResultParent.transform) {
			if (child.gameObject.activeSelf) {
				ObjectPool.instance.PoolObject(child.gameObject);
			}
		}



	}



	void LoadScoreBoard () {
		Reset ();
		if (FriendsOnly && FBUser.FacebookID == 0) {
			NGUITools.SetActive(LoginNotice, true);
			NGUITools.SetActive(Crown, false);
			return;
		} else {
			NGUITools.SetActive(LoginNotice, false);
		}

		NGUITools.SetActive (LevelSelector, false);
		CurrentLevelIcon.spriteName = "Level" + LevelID.ToString ();

		CurrentScoreboard = ScoreCache.GetScoreboard (LevelID, FriendsOnly, Today);
		if (CurrentScoreboard.ScoreResults.Count > 0 || CurrentScoreboard.LastPage) {
			//loading cache
			DrawList(CurrentScoreboard.ScoreResults);
		}
		else {
		   //downloading
		   StartCoroutine(DownloadNext());
		}
	}


	IEnumerator DownloadNext () {
		if (!CurrentScoreboard.LastPage) {
			List<ScoreResult> Target = CurrentScoreboard.ScoreResults;
			string url = Game.requestUrl + "scoreboard.ashx?game=" + Game.Id + "&level=" + LevelID + "&count=" + Amount + "&page=" + CurrentScoreboard.CurrentPage + "&mode=" + (Today ? "today" : "all") + (FriendsOnly ? "&user=" + FBUser.FacebookID : "");
			WWW request = new WWW (url);


			yield return request;
			if (!string.IsNullOrEmpty(request.error)) {
				Debug.Log("Error recieving scoreboard data");
			} 
			else {
				List<ScoreResult> CurrentResults = JsonConvert.DeserializeObject<List<ScoreResult>> (request.text);

				if (CurrentResults.Count > 0) {
					//lukker listen hvis ikke flere sider
					if (CurrentResults.Count < Amount) {
						CurrentScoreboard.LastPage = true;
					} else {
						CurrentScoreboard.CurrentPage++;
					}

					//fjerner sig selv fra listen
					CurrentResults.RemoveAll (s => s.ID == FBUser.FacebookID);

					Target.AddRange(CurrentResults);
					if (Target == CurrentScoreboard.ScoreResults)
					DrawList(CurrentResults);
				}
				else {
					CurrentScoreboard.LastPage = true;
				}
			}
		}
	}
	
	void DrawList (List<ScoreResult> list) {


		if (CurrentScoreboard.ScoreResults.Count == 0 && myScore != null)
			DrawMyScore ();

		foreach (ScoreResult res in list) {
			//Indsætter sig selv hvis score passer.
			if (myScore != null && IsBetter(myScore, res))
				DrawMyScore();

			//indsætter item'
			DrawItem(res);
		}

		//Last try (if bottom spot)..
		if (CurrentScoreboard.LastPage)
			DrawMyScore ();

		if (list.Count > 0 || myScoreLoaded) {
			NGUITools.SetActive(Crown, true);
		} else {
			NGUITools.SetActive(Crown, false);
		}

	}

	void LoadMyScore() {
		HighScore Score = Level.GetHighScore(LevelID);

		if (myScore == null)
			myScore = new ScoreResult();

		myScore.ID = FBUser.FacebookID;
		myScore.Name = FBUser.FacebookName;
		
		if (Today && Score.Today_Time > 0 && Score.Today == Format.ShortDate(DateTime.UtcNow)) {
			myScore.Score = Score.Today_Score;
			myScore.Streak = Score.Today_Streak;
			myScore.Time = Score.Today_Time;
		} 
		else if (!Today && Score.Time > 0) {
			myScore.Score = Score.Score;
			myScore.Streak = Score.Streak;
			myScore.Time = Score.Time;
		} else {
			myScore.Score = 0;
			myScore.Streak = 0;
			myScore.Time = 0;
		}
	}

	void DrawMyScore() {
		if (!myScoreLoaded && myScore.Time > 0 && FBUser.FacebookID != 0) {
			DrawItem(myScore);
			myScoreLoaded = true;
		}
	}

	bool IsBetter(ScoreResult mine, ScoreResult other) {
		if (mine.Score >= other.Score) {
			if (mine.Score == other.Score) {
				if (mine.Streak >= other.Streak) {
					if (mine.Streak == other.Streak) {
						if (mine.Time >= other.Time) {
							return true;
						}
					} else {
						return true;
					}
				}
			} else {
				return true;
			}
		}
		return false;
	}

	void DrawItem (ScoreResult res) {
		GameObject item = ObjectPool.instance.GetObjectForType ("LeaderBoardItem", false);

		item.transform.localPosition = new Vector3(0, 0 - CurrentPosition, 0);

		item.GetComponent<UISprite> ().width = ResultParent.GetComponent<UIWidget> ().width;

		item.GetComponent<LeaderBoard_Item>().Load(res, currentRank, Altering);
		Altering = !Altering;
		currentRank++;
		CurrentPosition += 101;

	}


	//
	//
	//  ACTIONS
	//
	public void LoadDefault() {
		if (CurrentScoreboard == null) {
			FriendsOnly = true;
			Today = false;
			LevelID = 1;
		}
		LoadScoreBoard ();
	}
	public void ShowFriends() {
		if (FriendsOnly != true || Today != false) {
			FriendsOnly = true;
			Today = false;
			LoadScoreBoard ();
		}
	}
	public void ShowAll() {
		if (FriendsOnly != false || Today != false) {
			FriendsOnly = false;
			Today = false;
			LoadScoreBoard ();
		}
	}

	public void ShowToday() {
		if (FriendsOnly != false || Today != true) {
			FriendsOnly = false;
			Today = true;
			LoadScoreBoard ();
		}
	}


}
