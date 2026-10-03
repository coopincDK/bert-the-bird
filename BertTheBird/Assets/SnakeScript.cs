using UnityEngine;
using System.Collections;

public class SnakeScript : MonoBehaviour {
	public GameObject Snake;
	public Transform DefaultPosition;
	public Vector3 Offset;
	Animator snakeAnim;
	bool Catch = false;
	bool Kill = false;


	// Use this for initialization
	void Awake () {
		snakeAnim = Snake.GetComponent<Animator> ();
	}
	
	void OnTriggerEnter2D(Collider2D Other) {
		if (Statics.Dead == false) {
			if (Other.gameObject == BirdController.instance.gameObject) {
					Debug.Log ("Found Bird");
					BirdController.instance.Die();
					Catch = true;
			} 
		}
	}

	void Update () {
		if (Catch) {

			if (Statics.Dead) {
				if (Kill == false) {
					snakeAnim.SetTrigger("Catch");
					Kill = true;
				}
				Snake.transform.position = BirdController.instance.transform.position + Offset;
				Snake.transform.rotation = BirdController.instance.transform.rotation;

			} else {
				Catch = false;
			}
		}
	}

	void OnEnable () {
		Snake.transform.position = DefaultPosition.position;
		Snake.transform.rotation = DefaultPosition.rotation;
		//snakeAnim.SetTrigger ("Reset");
		Catch = false;
		Kill = false;
	}
}
