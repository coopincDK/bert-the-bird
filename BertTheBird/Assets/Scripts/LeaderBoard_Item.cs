using UnityEngine;
using System.Collections;

public class LeaderBoard_Item : MonoBehaviour {
	public UITexture Image;
	UILabel Rank;
	UILabel Name;
	UILabel Score;
	UILabel Streak;
	UILabel Time;
	public System.Int64 id;


	// Use this for initialization
	void Awake () {
		Image = transform.FindChild ("Image").GetComponent<UITexture> ();
		Rank = transform.FindChild ("Rank").GetComponent<UILabel> ();
		Name = transform.FindChild ("Name").GetComponent<UILabel> ();
		Score = transform.FindChild ("Score").GetComponent<UILabel> ();
		Streak = transform.FindChild ("Streak").GetComponent<UILabel> ();
		Time = transform.FindChild ("Time").GetComponent<UILabel> ();
	}
	
	// Update is called once per frame
	public void Load (ScoreResult res, int rank, bool Altering) {
		id = res.ID;
		Rank.text = Format.Number(rank);
		Name.text = res.Name;
		Score.text = Format.Number(res.Score);
		Streak.text = "x" + res.Streak.ToString ();
		Time.text = Format.Time (res.Time, false);

		if (Altering)
			GetComponent<UISprite>().spriteName = "leaderboard_result_bg2";
		else 
			GetComponent<UISprite>().spriteName = "leaderboard_result_bg1";
		if (res.Image == null) {
			//downloading image!
			StartCoroutine(LoadImage (res));
		} 
		else {
			//using cached image!
			Image.mainTexture = res.Image;
		}

	}
	




	IEnumerator LoadImage(ScoreResult res) {
		Texture2D tex = new Texture2D(72, 72, TextureFormat.DXT1, false);
		string url = "http://graph.facebook.com/" + id.ToString() + "/picture?type=square";
		WWW www = new WWW(url);
		yield return www;
		
		if (string.IsNullOrEmpty(www.error)) {
			www.LoadImageIntoTexture(tex);
			Image.mainTexture = tex;
			res.Image = tex;

		}
		StopCoroutine("LoadImage");
	}



}
