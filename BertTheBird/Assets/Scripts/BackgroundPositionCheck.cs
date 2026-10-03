using UnityEngine;
using System.Collections;



public class BackgroundPositionCheck : MonoBehaviour {
	public BackgroundLayers BgLayer;
	UISprite Img;

	void Start() {
		Img = GetComponent<UISprite> ();
	}

	// Update is called once per frame
	void FixedUpdate () {
		if (transform.position.x < -5f) {
			ChangeImage();
		}
	}

	void ChangeImage() {
		BackgroundSprite NewBG;
		LevelObject lvl = Level.CurrentLevel;
		if (lvl.ID == 0) {
			lvl = Level.Control.Levels[1];
		}

		if (BgLayer == BackgroundLayers.Sky)
			NewBG = lvl.Background_Sky.Images [Random.Range (0, lvl.Background_Sky.Images.Length)];
		else if (BgLayer == BackgroundLayers.Bg)
			NewBG = lvl.Background_Bg.Images [Random.Range (0, lvl.Background_Bg.Images.Length)];
		else if (BgLayer == BackgroundLayers.Mg)
			NewBG = lvl.Background_Mg.Images [Random.Range (0, lvl.Background_Mg.Images.Length)];
		else
			NewBG = lvl.Background_Fg.Images [Random.Range (0, lvl.Background_Fg.Images.Length)];

		Img.spriteName = NewBG.SpriteName;
		Img.height = NewBG.Height;

		float newX = transform.localPosition.x + 3840;
		transform.localPosition = new Vector3(newX, NewBG.y, 0);
	}
}
