using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System;
using System.Linq;


public static class ScoreCache {
	private static List<CachedScoreboard> ScoreBoards = new List<CachedScoreboard> ();

	public static CachedScoreboard GetScoreboard(int LevelID, bool FriendsOnly, bool Today) {
		CachedScoreboard current = ScoreBoards.FirstOrDefault (s => s.LevelID == LevelID && s.FriendsOnly == FriendsOnly && s.Today == Today);
		if (current == null) {
			current = new CachedScoreboard(){
				LevelID = LevelID,
				Today = Today,
				FriendsOnly = FriendsOnly,
				CurrentPage = 1,
				LastPage = false,
				ScoreResults = new List<ScoreResult>()
			};
		}
		ScoreBoards.Add (current);
		return current;

	}
}

public class ScoreResult {
	public Texture2D Image { get; set; }
	public Int64 ID { get; set;}
	public string Name { get; set;}
	public int Score { get; set;}
	public int Streak { get; set;}
	public float Time { get; set;}
}

public class CachedScoreboard {
	public int LevelID {get; set;}
	public bool Today {get; set;}
	public bool FriendsOnly {get; set;}
	public int CurrentPage {get; set;}
	public bool LastPage {get; set;}
	public List<ScoreResult> ScoreResults { get; set; }
}



	///public static 

