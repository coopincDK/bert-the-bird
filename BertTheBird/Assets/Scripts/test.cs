using UnityEngine;
using System.Collections;

public class test : MonoBehaviour {
	TweenScale ts;
	Vector3 bigscale = new Vector3(2.5f,2.5f,1f);
	// Use this for initialization
	void Start () {
		ts = gameObject.GetComponent<TweenScale> ();
	}
	
	// Update is called once per frame
	void Update () {
		if (Input.GetMouseButtonDown(0)) {
			transform.localScale = bigscale;
			ts.ResetToBeginning();
			ts.Play(true);
			Debug.Log("button");
		}
	}


}
