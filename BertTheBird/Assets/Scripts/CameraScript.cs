using UnityEngine;
using System.Collections;

public class CameraScript : MonoBehaviour {
	public GameSpeed gs;
	public BirdController bc;

	//Parralex Background
	public Transform SkyBackground;
	public float SkySlack = 0.03f;
	public Transform BgBackground;
	public float BgSlack = 0.07f;
	public Transform MgBackground;
	public float MgSlack = 0.12f;
	public Transform FgBackground;
	public float FgSlack = 0.6f;

	float CurrentPosition;
	float offset = 0;
	float z;
	float y;

	void Start() {
		y = transform.position.y;
		z = transform.position.z;
	}




	// Update is called once per frame
	void Update () {
		//Stuck on bird;
		if (Statics.GameRunning && !Statics.PreWarmMode) {
			if (offset == 0) {
				offset = transform.position.x - bc.transform.position.x;
			}
			transform.position = new Vector3(bc.transform.position.x + offset, y, z);

		} else {
			if (offset != 0) {
				offset = 0;
			}
			transform.Translate(gs.userDirection * gs.movespeed * gs.Speed * Time.deltaTime);
		}
		MoveBackgrounds ();
	}


	void MoveBackgrounds() {
		CurrentPosition = -transform.position.x * 70;
		SkyBackground.localPosition = new Vector3 (CurrentPosition * Level.CurrentLevel.Background_Sky.Slack, 0, 0);
		BgBackground.localPosition = new Vector3 (CurrentPosition * Level.CurrentLevel.Background_Bg.Slack, 0, 0);
		MgBackground.localPosition = new Vector3 (CurrentPosition * Level.CurrentLevel.Background_Mg.Slack, 0, 0);
		FgBackground.localPosition = new Vector3 (CurrentPosition * Level.CurrentLevel.Background_Fg.Slack, 0, 0);
	}
}
