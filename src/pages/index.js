// instead of client-side navigation, use server-side rendering which improves SEO
export async function getServerSideProps(context) {
    return {
        redirect: {
            destination: '/home',
            permanent: true,
        },
    }
}

// since we are redirecting, we don't need to render anything
export default function Index() {
    return null;
}