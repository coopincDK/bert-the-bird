using UnityEngine;
using System.Collections;

public class FixFaces : MonoBehaviour {
	public GameObject TopFace;
	public GameObject BottomFace;
	// Use this for initialization
	void OnEnable () {
		TopFace.SetActive (true);
		BottomFace.SetActive (true);

		Invoke ("fixFaces", 0.05f);


	}

	void fixFaces() {
		if (transform.position.y > 0) {
			TopFace.SetActive(false);
		} else {
			BottomFace.SetActive(false);
		}
	}
}
